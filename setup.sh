#!/bin/bash

# Criar diretório src
mkdir src

# Identificar o sistema operacional
if [[ "$OSTYPE" == "linux-gnu"* || "$OSTYPE" == "darwin"* ]]; then
    mv logs ./src
    mv modules ./src
    rm -rf .git
elif [[ "$OSTYPE" == "win32" ]]; then
    move logs ./src && move modules ./src
    rmdir /s /q ".git"
fi

echo "Insira o link do seu novo repositório:"
read repoURL

git init
git add .
git commit -m "setup my enviroment"
git remote add origin $repoURL
git branch -M main
git push -u origin main

npm install

echo "Ready to use! :D"