#!/bin/bash

# Load environment variables from .env if it exists
if [ -f .env ]; then
  # Source .env by exporting non-comment lines
  export $(grep -v '^#' .env | xargs)
else
  echo "❌ Error: .env file not found."
  echo "Please create a .env file containing the required keys before running this script."
  exit 1
fi

keys=(
  "VITE_FIREBASE_API_KEY"
  "VITE_FIREBASE_AUTH_DOMAIN"
  "VITE_FIREBASE_PROJECT_ID"
  "VITE_FIREBASE_STORAGE_BUCKET"
  "VITE_FIREBASE_MESSAGING_SENDER_ID"
  "VITE_FIREBASE_APP_ID"
  "VITE_GEMINI_API_KEY"
)

# Loop through each variable and set it on Vercel
for key in "${keys[@]}"; do
  # Get the value of the environment variable dynamically
  val="${!key}"
  
  if [ -z "$val" ]; then
    echo "⚠️ Warning: $key is empty or not set in .env. Skipping..."
    continue
  fi
  
  # Remove quotes if present
  val=$(echo "$val" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
  
  for env in production preview development; do
    echo "Configuring $key for $env..."
    # Pipe the value into Vercel CLI to prevent interactive prompts
    echo -n "$val" | npx vercel env add "$key" "$env" --yes --force
  done
done

echo "🎉 All environment variables have been successfully configured on Vercel!"
