FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential \
       libgomp1 \
       libpq-dev \
       curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements-api.txt /app/requirements-api.txt

RUN pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r /app/requirements-api.txt

COPY . /app

ENV PYTHONPATH=/app

RUN mkdir -p /app/keys /app/logs

ENV MODEL_PATH=/app/Modules/best_model_food100.keras
ENV CLASS_NAMES_PATH=/app/Modules/class_names.json
ENV JWT_PUBLIC_KEY_PATH=/app/keys/public.pem

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]