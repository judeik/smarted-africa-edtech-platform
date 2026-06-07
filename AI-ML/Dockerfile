FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN addgroup --system aiml && adduser --system --ingroup aiml aiml
USER aiml

EXPOSE 8001
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:8001/health || exit 1
# gunicorn with uvicorn workers: multi-process for concurrent request handling.
# WORKERS default 2; override with GUNICORN_WORKERS env var in Railway dashboard.
CMD ["sh", "-c", "gunicorn openai_api:app -k uvicorn.workers.UvicornWorker -w ${GUNICORN_WORKERS:-2} -b 0.0.0.0:8001 --timeout 120 --graceful-timeout 30 --access-logfile -"]
