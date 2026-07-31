#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path
import warnings

from dotenv import load_dotenv
from langchain_oci import ChatOCIGenAI

warnings.filterwarnings("ignore", message="Core Pydantic V1 functionality")


def _err(msg: str, code: int = 1):
    sys.stderr.write(msg + "\n")
    print(json.dumps({"success": False, "error": msg}))
    raise SystemExit(code)


def _get_env(name: str, default: str | None = None) -> str | None:
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().strip('"').strip("'")


def main():
    env_path = Path(__file__).resolve().parent / ".env"
    load_dotenv(env_path)

    raw = sys.stdin.read().strip()
    if not raw:
        _err("No input provided to OCI bridge")

    try:
        payload = json.loads(raw)
    except Exception as e:
        _err(f"Invalid JSON input: {e}")

    system_prompt = payload.get("system_prompt", "")
    user_prompt = payload.get("user_prompt", "")
    max_tokens = int(payload.get("max_tokens", 2048))
    temperature = float(payload.get("temperature", 0.2))

    endpoint = _get_env("OCI_GENAI_ENDPOINT")
    model_id = _get_env("OCI_GENAI_MODEL_ID")
    compartment_id = _get_env("OCI_COMPARTMENT_ID")
    profile = _get_env("CONFIG_PROFILE", "DEFAULT")

    if not endpoint:
        _err("Missing OCI_GENAI_ENDPOINT in .env")
    if not model_id:
        _err("Missing OCI_GENAI_MODEL_ID in .env")
    if not compartment_id:
        _err("Missing OCI_COMPARTMENT_ID in .env")

    try:
        llm = ChatOCIGenAI(
            model_id=model_id,
            service_endpoint=endpoint,
            compartment_id=compartment_id,
            model_kwargs={
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
            auth_type="API_KEY",
            auth_profile=profile,
        )

        messages = []
        if system_prompt:
            messages.append(("system", system_prompt))
        messages.append(("human", user_prompt))

        response = llm.invoke(messages)
        content = getattr(response, "content", None)
        if content is None:
            text = str(response)
        elif isinstance(content, str):
            text = content
        elif isinstance(content, list):
            chunks: list[str] = []
            for item in content:
                if isinstance(item, str):
                    chunks.append(item)
                elif isinstance(item, dict):
                    maybe_text = item.get("text") or item.get("content")
                    if maybe_text:
                        chunks.append(str(maybe_text))
                else:
                    chunks.append(str(item))
            text = "".join(chunks).strip()
        else:
            text = str(content)

        print(json.dumps({"success": True, "text": text}))
    except Exception as e:
        _err(f"OCI GenAI invocation failed: {e}")


if __name__ == "__main__":
    main()
