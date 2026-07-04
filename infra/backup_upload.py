#!/usr/bin/env python3
"""backup-db.sh의 업로드/보관기간 정리 헬퍼.

aws-cli(awscrt 서명기)가 OCI S3 호환 엔드포인트에 간헐적으로 SignatureDoesNotMatch를
내는 걸 확인해서(같은 자격증명·명령이 방금 성공하고 바로 다음 호출에 실패), boto3의
classic SigV4 서명으로 대체했다. 반복 테스트(5회 연속 put/delete)에서는 실패 없었음.
"""
import os
import sys
from datetime import datetime, timedelta, timezone

import boto3
from botocore.config import Config


def client():
    return boto3.client(
        "s3",
        endpoint_url=os.environ["OCI_S3_ENDPOINT"],
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        region_name=os.environ.get("OCI_S3_REGION", "ap-tokyo-1"),
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


def put(key: str, file_path: str) -> None:
    bucket = os.environ["BACKUP_BUCKET"]
    with open(file_path, "rb") as f:
        client().put_object(Bucket=bucket, Key=key, Body=f.read())


def rotate(prefix: str, days: int) -> None:
    bucket = os.environ["BACKUP_BUCKET"]
    s3 = client()
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=f"{prefix}/"):
        for obj in page.get("Contents", []):
            if obj["LastModified"] < cutoff:
                s3.delete_object(Bucket=bucket, Key=obj["Key"])
                print(f"rotated out: {obj['Key']}")


if __name__ == "__main__":
    command = sys.argv[1]
    if command == "put":
        put(sys.argv[2], sys.argv[3])
    elif command == "rotate":
        rotate(sys.argv[2], int(sys.argv[3]))
    else:
        raise SystemExit(f"unknown command: {command}")
