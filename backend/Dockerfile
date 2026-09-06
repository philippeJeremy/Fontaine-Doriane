FROM python:3.12-slim-bookworm AS base

RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

FROM base AS dev
ENTRYPOINT ["sh", "/app/entrypoint.sh"]
CMD ["--reload"]

FROM base AS prod
ENTRYPOINT ["sh", "/app/entrypoint.sh"]
CMD []