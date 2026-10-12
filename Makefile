# Comandos del monorepo. Ejecutar desde la raíz con GNU Make.
# En Windows el intérprete es el virtualenv de Scripts; en el resto, bin.

ifeq ($(OS),Windows_NT)
PY := .venv/Scripts/python.exe
else
PY := .venv/bin/python
endif

.DEFAULT_GOAL := help

.PHONY: help install backend-install mobile-install check \
	backend-lint backend-format backend-format-check backend-check \
	backend-test backend-migrations \
	mobile-lint mobile-typecheck mobile-format mobile-format-check mobile-test \
	postgres migrate run \
	compose-build compose-migrate compose-up compose-test compose-stop \
	android

help:
	@echo Uso: make [objetivo]
	@echo ---
	@echo   help                  Muestra estos objetivos
	@echo   install               Crea el virtualenv, instala requirements-dev.txt y ejecuta npm ci
	@echo   check                 Ejecuta las mismas comprobaciones que la integración continua
	@echo   backend-lint          Ruff check
	@echo   backend-format-check  Ruff format --check
	@echo   backend-format        Aplica el formato de Ruff
	@echo   backend-check         manage.py check
	@echo   backend-test          manage.py test
	@echo   backend-migrations    makemigrations --check --dry-run
	@echo   mobile-typecheck      tsc --noEmit
	@echo   mobile-lint           ESLint
	@echo   mobile-format-check   Prettier --check
	@echo   mobile-format         Aplica Prettier
	@echo   mobile-test           Jest
	@echo   postgres              docker compose up -d postgres
	@echo   migrate               manage.py migrate con el virtualenv local
	@echo   run                   manage.py runserver con el virtualenv local
	@echo   compose-build         Construye la imagen del backend
	@echo   compose-migrate       Migra dentro del contenedor backend
	@echo   compose-up            Arranca el servicio backend
	@echo   compose-test          manage.py test dentro del contenedor backend
	@echo   compose-stop          docker compose stop
	@echo   android               npm run android

install: backend-install mobile-install

backend-install:
ifeq ($(wildcard backend/.venv),)
	python -m venv backend/.venv
endif
	cd backend && $(PY) -m pip install -r requirements-dev.txt

mobile-install:
	npm --prefix mobile ci

check: backend-lint backend-format-check backend-check backend-test backend-migrations \
	mobile-typecheck mobile-lint mobile-format-check mobile-test

backend-lint:
	cd backend && $(PY) -m ruff check .

backend-format-check:
	cd backend && $(PY) -m ruff format --check .

backend-format:
	cd backend && $(PY) -m ruff format .

backend-check:
	cd backend && $(PY) manage.py check

backend-test:
	cd backend && $(PY) manage.py test

backend-migrations:
	cd backend && $(PY) manage.py makemigrations --check --dry-run

mobile-typecheck:
	npm --prefix mobile run typecheck

mobile-lint:
	npm --prefix mobile run lint

mobile-format-check:
	npm --prefix mobile run format:check

mobile-format:
	npm --prefix mobile run format

mobile-test:
	npm --prefix mobile test

postgres:
	docker compose up -d postgres

migrate:
	cd backend && $(PY) manage.py migrate

run:
	cd backend && $(PY) manage.py runserver

compose-build:
	docker compose build backend

compose-migrate:
	docker compose run --rm backend python manage.py migrate

compose-up:
	docker compose up -d backend

compose-test:
	docker compose run --rm backend python manage.py test

compose-stop:
	docker compose stop

android:
	npm --prefix mobile run android
