<a id="readme-top"></a>

<br />
<div align="center">
  <a href="https://github.com/engines2k/finitude">
    <img src="public/icon/128.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Finitude</h3>

  <p align="center">
    Remove infinite scrolling from Youtube subscriptions.
    <br />
    <br />
    <a href="https://github.com/engines2k/finitude/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
    &middot;
    <a href="https://github.com/engines2k/finitude/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>
  </p>
</div>

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about">About</a>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>


## About 

There are many great extensions for removing distractions and simplifying YouTube, but none of them minimzlize or extend the subscriptions page in the way I would like.

The goal of this extension is to be able to hit an "inbox zero" by constraining the length of the subscriptions page, and in the future extend it with features for grouping subscriptions, limiting videos from the same channel, and more.

The lack of simple options for a user wishing to minimize their experience on social media and reduce contact with harmful features like infinite scrolling is frustrating. This is my attempt to remedy that in some small way. I hope it can help you reclaim digital peace!

This extension is built with WXT and SvelteKit.


## Getting Started

This is an example of how you may give instructions on setting up your project locally.
To get a local copy up and running follow these simple example steps.


### Prerequisites

* pnpm

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/engines2k/finitude.git
   ```
2. Install NPM packages
   ```sh
   cd finitude
   pnpm install
   ```
3. Run postinstall WXT script
   ```sh
   pnpm postinstall
   ```
4. Generate Firefox profile
   ```sh
   mkdir -p .wxt/firefox-profile
   firefox -profile .wxt/firefox-profile -CreateProfile "finitude" 2>/dev/null || true
   ```

### Testing

```sh
pnpm dev
```

### Building

```sh
pnpm build
```

## Roadmap

- [x] Limit subscriptions feed by video publish date (list view)
- [x] Remove feed continuation from subscriptions (list view)
- [x] Popup for adjusting date for video filtering
- [ ] Limit videos in recommendation feed to a amount
- [ ] Multi-language Support
    - [ ] French
    - [ ] Spanish

See the [open issues](https://github.com/engines2k/finitude/issues) for a full list of proposed features (and known issues).


## Contributing

To anyone who would be interested, any contributions would be **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repository and create a pull request. You can also simply open an issue with the tag "enhancement".

Feel free to drop a star if you like.


## License

Distributed under GNU GPL v3. See `LICENSE.txt` for more information.


## Contact

Zeke Barefoot - [@engines2k](https://twitter.com/engines2k) - zekebarefoot0@gmail.com

<p align="right">(<a href="#readme-top">back to top</a>)</p>


