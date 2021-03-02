module.exports = {
  async rewrites() {
    return [
      {
        source: '/.well-known/acme-challenge/ln3ocgHJTO9ArpgN-T4pnXx3_rnobI4FKQfh9kGWaX4',
        destination: '/api/challenge',
      },
    ]
  },
}