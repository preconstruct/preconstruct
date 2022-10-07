---
sidebar_position: 1
---

# Dictionary

This page documents some common words and phrases that are used throughout this site and when discussing Preconstruct.

## single-package repo {#single-package-repo}

A repository which only contains a single package which is at the root of the repo

## monorepo {#monorepo}

A repository that contains multiple packages, this is sometimes also referred to as a multi-package repo but we use monorepo because it is what is predominantly used in the JS ecosystem. This is generally linked together with a tool such as [Yarn Workspaces](https://yarnpkg.com/lang/en/docs/workspaces/), [Bolt](https://github.com/boltpkg/bolt) or [Lerna](https://lerna.js.org/). Note that this is different from the definition of monorepo that is sometimes used which describes a monorepo as a single repo for an organisation/project. Even though this is the original definition, the meaning of the term has evolved into the definition we use within the JavaScript community.

## entrypoint {#entrypoint}

Something that is intended to be imported from outside a package with an associated source file and build types

## package {#package}

A set of entrypoints with dependencies that is generally published to a package registry such as npm

## project {#project}

The overarching structure where all Preconstruct commands are run with a set of packages and global config

## build type {#build-type}

A file or group of files that Preconstruct outputs that is differentiated by its module type, whether it is intended for the browser or etc.

## externals {#externals}

Modules that shouldn't be bundled and should instead be left as imports

## module format type {#module-format-type}

The [`"type"`](https://nodejs.org/api/packages.html#type) field that defines the module format Node.js uses for files that have that package.json file as their nearest parent.
