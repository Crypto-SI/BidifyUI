/**
 * Layer between client and Bidify that performs method calls and manages states
 * @module listings
 * @example
 * const listings = require('~/plugins/listings.js')
 *
 * listings.get(...)
 */

/**
 * Mutations for assets from opensea
 * @name transformAssets
 * @method
 * @param {array} listings listings.assets[x] to transform
 * @memberof listings
 */

const transformAssets = (listings) => {
  if (!listings || !listings.assets) {
    return listings
  }

  return listings.assets.map((l, i) => {
    l.address = l.asset_contract.address

    l.owned = l.owner.address === 'foo'

    l.label = l.name

    l.index = i

    return l
  })
}

/**
 * Mutates listings from listing { object } to opensea assets
 * @name addAssetsToListings
 * @method
 * @param {array} listings { listing ... } to transform
 * @memberof listings
 */

async function addAssetsToListings (listings) {
  const seaport = require('~/plugins/opensea.js')

  const assetList = listings.map((l) => {
    return {
      token_id: l.token,
      address: l.platform
    }
  })

  const assets = transformAssets(await seaport.getAssets(assetList))

  return listings.map((l) => {
    let match = assets.find(t => t.address === l.platform && t.token === l.token_id)

    if (!match) {
      match = {
        label: `Bidify ${l.id}`,
        creator: {
          address: l.creator,
          user: {}
        }
      }
    }

    return Object.assign({}, l, match)
  })
}

/**
 * Mutates NFT's from platform/token pairs to opensea assets
 * @name addAssetsToNfts
 * @method
 * @param {array} nfts { platform, token } to transform
 * @memberof listings
 */

async function addAssetsToNfts (nfts) {
  const seaport = require('~/plugins/opensea.js')

  const assetList = nfts.map((l) => {
    return {
      token_id: l.token,
      address: l.platform
    }
  })

  const assets = transformAssets(await seaport.getAssets(assetList))

  return nfts.map((l, i) => {
    let match = assets.find(t => t.address === l.platform && t.token === l.token_id)

    if (!match) {
      match = {
        label: `NFT ${i}`,
        creator: {
          address: l.creator,
          user: {}
        }
      }
    }

    return Object.assign({}, l, match)
  })
}

/**
 * Gets current listings (from route param), merges with open sea, then commits to store 'localStorage/listing'
 * @name get
 * @method
 * @param {object} $store context
 * @memberof listings
 */

export async function get ({ $store }) {
  const bidify = require('~/plugins/bidify.js')

  // get bidify listings
  const listings = await bidify.getListings()

  // get bidify listing for each
  for (const i in listings) {
    listings[i] = await bidify.getListing(i)
  }

  // get assets and merge data
  const assets = await addAssetsToListings(listings)

  // commit to store
  $store.commit('localStorage/listing', assets)
}

/**
 * Get a user's NFT's in custody, merges with open sea, then commits to store 'localStorage/owned'
 * @name getOwned
 * @method
 * @param {object} $store context
 * @memberof listings
 */

export async function getOwnedListings ({ $store }) {
  const bidify = require('~/plugins/bidify.js')

  const account = $store.state.wallets.account

  if (!account) {
    return
  }

  // get bidify listings
  const listings = await bidify.getListings(account)

  // get bidify listing for each
  for (const i in listings) {
    listings[i] = await bidify.getListing(i)
  }

  // get assets and merge data
  const assets = await addAssetsToListings(listings)

  // commit to store
  $store.commit('localStorage/owned', assets)
}

/**
 * Gets a single listing (from route param), merges with open sea, then commits to store 'localStorage/active'
 * @name getOne
 * @method
 * @param {object} $store context
 * @param {object} $route context
 * @memberof listings
 */

export async function getOne ({ $store, $route }) {
  const bidify = require('~/plugins/bidify.js')

  const id = $route.params.id.toString()

  const listing = await bidify.getListing(id)

  const assets = await addAssetsToListings([listing])

  if (!assets || !assets.length) {
    return
  }

  $store.commit('localStorage/active', assets[0])
}

/**
 * Get a user's NFT's that haven't been listed, merges with open sea, then commits to store 'localStorage/owned'
 * @name getOwned
 * @method
 * @param {object} $store context
 * @memberof listings
 */

export async function getOwnedNFTs ({ $store }) {
  const bidify = require('~/plugins/bidify.js')

  const nfts = await bidify.getNFTs()

  const assets = await addAssetsToNfts(nfts)

  $store.commit('localStorage/nfts', assets)

  return assets
}

/**
 * Lists an NFT to Bidify
 * @name list
 * @method
 * @param {object} $store context
 * @param {object} params for listing
 * @memberof listings
 */

export async function list ({ $store, params }) {
  const bidify = require('~/plugins/bidify.js')

  $store.commit('bidify/approving', true)

  const approval = await bidify.listApprove(params)

  console.log(approval)

  $store.commit('bidify/listing', true)
  $store.commit('bidify/approving', false)

  const result = await bidify.list(params)

  $store.commit('bidify/listing', false)

  return result
}

/**
 * Mints an NFT (development only)
 * @name mint
 * @method
 * @param {object} $store context
 * @param {string} tokenId
 * @memberof listings
 */

export async function mint ({ $store, tokenId }) {
  const bidify = require('~/plugins/bidify.js')

  return await bidify.mintNFT(tokenId)
}