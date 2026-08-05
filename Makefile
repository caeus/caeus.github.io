.PHONY: dev build push format lint

dev:
	yarn workspace ui dev

build: format
	yarn workspace ui build

push: build
	git add -A
	git commit -m "build"
	git push

format:
	yarn workspace ui format

lint:
	yarn workspace ui lint
