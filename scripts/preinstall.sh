#!/bin/bash

echo "Running the preinstall hook where the patches are copied into the dist directory"

if [ ! -d dist ]; then
  mkdir dist
fi
rm -rf dist/patches
cp -a patches dist/

echo "Successfully copied the patches into the dist directory"