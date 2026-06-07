FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN addgroup --system aiml && adduser --system --ingroup aiml aiml
USER aiml

EXPOSE 8001
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD python3 -c "import urllib.request,os; urllib.request.urlopen('http://localhost:'+os.environ.get('PORT','8001')+'/health', timeout=5)" || exit 1
# Render injects PORT dynamically. Gunicorn must bind to $PORT, not a hardcoded value.
CMD ["sh", "-c", "gunicorn openai_api:app -k uvicorn.workers.UvicornWorker -w ${GUNICORN_WORKERS:-2} -b 0.0.0.0:${PORT:-8001} --timeout 120 --graceful-timeout 30 --access-logfile -"]
