.PHONY: dev build push format lint

dev:
	yarn dev

build:
	yarn build

push: build
	git add -A
	git commit -m "build"
	git push

format:
	yarn format

lint:
	yarn lint
