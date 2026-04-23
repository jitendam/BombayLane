/**
 * Format a raw Prisma restaurant row into the nested API shape expected by clients.
 * Flat DB columns (locationAddress, locationCity, openHours, closeHours) are
 * converted to nested { location, openingHours } objects.
 */
const formatRestaurant = (r) => {
  if (!r) return r;
  const { locationAddress, locationCity, locationLat, locationLng, openHours, closeHours, ...rest } = r;
  return {
    ...rest,
    location: {
      address: locationAddress,
      city: locationCity,
      ...(locationLat != null ? { coordinates: { lat: locationLat, lng: locationLng } } : {})
    },
    openingHours: { open: openHours, close: closeHours }
  };
};

module.exports = { formatRestaurant };
