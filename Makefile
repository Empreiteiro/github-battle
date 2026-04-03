.PHONY: install dev build preview lint clean netlify-dev deploy help

NPM := npm

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	$(NPM) install

dev: install ## Start Vite dev server (local mode, no backend)
	$(NPM) run dev

build: install ## Type-check and build for production
	$(NPM) run build

preview: build ## Build and preview the production bundle
	$(NPM) run preview

lint: ## Run ESLint
	$(NPM) run lint

netlify-dev: install ## Start with Netlify CLI (full backend support)
	npx netlify dev

deploy: build ## Deploy to Netlify production
	npx netlify deploy --prod

clean: ## Remove build artifacts and node_modules
	rm -rf dist node_modules .netlify
