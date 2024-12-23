#!/bin/bash

echo "Running the preinstall hook"

echo "First we need to check if this is the local build or a dist build"

if [ -d dist/patches ]; then
  echo "The patches folder already exists in the dist directory, so nothing to do here!"
  exit 0
fi

echo "The patches folder does not exist, so let's copy it there..."

if [ -d patches ]; then
  echo "The patches folder is in the cwd of this script, copying it to the dist directory now..."
  cp -a patches dist/
  echo "Successfully copied the patches folder..."
  exit 0
fi

echo "The patches folder is not in the cwd of this script, looking 1 level up (we may be in ./tmp)"

if [ -d ../patches ]; then
  echo "The patches folder 1 level up!"
  cp -a ../patches dist/
  echo "Successfully copied the patches folder..."
  exit 0
fi

echo "Can't find the patches folder... Please check where it is relative to: $(pwd)"
exit 1