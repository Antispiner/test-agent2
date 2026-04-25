.PHONY: demo down clean logs qr

URL := http://localhost:80

demo:
	docker compose up --build -d
	@echo ""
	@echo "Snake Arena running at $(URL)"
	@echo ""
	@if command -v qrencode >/dev/null 2>&1; then \
		qrencode -t ANSI '$(URL)'; \
	else \
		echo "(install 'qrencode' for QR code: brew install qrencode)"; \
	fi
	@echo ""
	@echo "Open 2 browser tabs at $(URL) to play."
	@echo "Stop with: make down"

down:
	docker compose down

clean:
	docker compose down -v --rmi local

logs:
	docker compose logs -f

qr:
	@if command -v qrencode >/dev/null 2>&1; then \
		qrencode -t ANSI '$(URL)'; \
	else \
		echo "$(URL)"; \
	fi
