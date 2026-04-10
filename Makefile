.PHONY: install dev build preview lint clean netlify-dev deploy android-sync android-open android-build help

NPM := npm

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

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

android-sync: build ## Sync web build to Android project
	npx cap sync android

android-open: android-sync ## Open Android project in Android Studio
	npx cap open android

android-build: android-sync ## Assemble a debug APK via Gradle (requires JDK + Android SDK)
	cd android && ./gradlew assembleDebug
	@echo "APK: android/app/build/outputs/apk/debug/app-debug.apk"

clean: ## Remove build artifacts and node_modules
	rm -rf dist node_modules .netlify
