.PHONY: dev build push format lint

dev:
	moon run ui:dev

build:
	moon run ui:build

push: build
	git add -A
	git commit -m "build"
	git push

format:
	moon run ui:format

lint:
	moon run ui:lint
