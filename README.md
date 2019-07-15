<h1 align="center">
  <img width=20% src="https://raw.githubusercontent.com/MidasCore/McashLight/master/packages/popup/static/logo.png">
</h1>




<p align="center">
 
    
  <a href="https://travis-ci.org/MidasCore/McashLight">
    <img src="https://travis-ci.org/MidasCore/McashLight.svg?branch=develop">
  </a>
  
  <a href="https://codecov.io/gh/MidasCore/McashLight">
    <img src="https://codecov.io/gh/MidasCore/McashLight/branch/develop/graph/badge.svg" />
  </a>
  
  <a href="https://github.com/MidasCore/McashLight/issues">
    <img src="https://img.shields.io/github/issues/MidasCore/McashLight.svg">
  </a>
  
  <a href="https://github.com/MidasCore/McashLight/pulls">
    <img src="https://img.shields.io/github/issues-pr/MidasCore/McashLight.svg">
  </a>
  
  <a href="https://github.com/MidasCore/McashLight/graphs/contributors"> 
    <img src="https://img.shields.io/github/contributors/MidasCore/McashLight.svg">
  </a>
 
 
</p>
# McashLight

McashLight is a browser wallet for MCASH. It enables you to send and receive MCASH, M1, M20 and M721 tokens. Developers can integrate McashLight into their website to create Decentralised Apps.

## Downloads
**Chrome** &ndash; [Download](https://chrome.google.com/webstore/detail/loiopaejobjggipodncmajcmdolegdan) &nbsp; [![Chrome Web Store](https://img.shields.io/chrome-web-store/d/loiopaejobjggipodncmajcmdolegdan.svg?style=flat-square)](https://chrome.google.com/webstore/detail/loiopaejobjggipodncmajcmdolegdan) &nbsp; [![Chrome Web Store](https://img.shields.io/chrome-web-store/rating/loiopaejobjggipodncmajcmdolegdan.svg?style=flat-square)](https://chrome.google.com/webstore/detail/loiopaejobjggipodncmajcmdolegdan)

**Firefox** &ndash; Coming soon

## Installation

#### Install yarn
**https://yarnpkg.com/en/docs/install**

#### Install dependencies
```sh
$ yarn install
$ lerna bootstrap
```

## Building
```sh
# Build all sources
$ yarn build
```

```sh
# Build the backend, along with the injected page script
$ yarn build:core
```

```sh
# Build only the popup component
$ yarn build:popup
```

## Linting
```sh
# Run linter over the ./packages folder
$ yarn lint
```

## Links
+ [Website](https://mcash.network/)
+ [Support](https://t.me/MCashChain)
+ [Twitter @MCashChain](https://twitter.com/MCashChain)
