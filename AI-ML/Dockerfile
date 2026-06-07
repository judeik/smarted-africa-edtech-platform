FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN addgroup --system aiml && adduser --system --ingroup aiml aiml
USER aiml

EXPOSE 8001
CMD ["uvicorn", "openai_api:app", "--host", "0.0.0.0", "--port", "8001"]
