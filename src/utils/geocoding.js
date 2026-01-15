import https from 'https';

/**
 * Get address from coordinates using Yandex Geocoding API
 * @param {string} location - Coordinates in format "latitude, longitude" or "latitude,longitude"
 * @returns {Promise<string|null>} - Address string or null if failed
 */
export const getAddressFromCoordinates = async (location) => {
  if (!location) return null;

  try {
    // Parse coordinates
    const coords = location.split(',').map(c => c.trim());
    if (coords.length !== 2) {
      console.log('Invalid coordinates format:', location);
      return null;
    }

    const [lat, lon] = coords.map(Number);
    if (isNaN(lat) || isNaN(lon)) {
      console.log('Invalid coordinates values:', lat, lon);
      return null;
    }

    // Try Yandex Geocoding API first
    // Using reverse geocoding: longitude,latitude (Yandex uses lon,lat order)
    const yandexUrl = `https://geocode-maps.yandex.ru/1.x/?geocode=${lon},${lat}&format=json&lang=uz_UZ&results=1`;
    
    try {
      const response = await new Promise((resolve, reject) => {
        const request = https.get(yandexUrl, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (error) {
              reject(error);
            }
          });
        });
        
        request.on('error', (error) => {
          reject(error);
        });
        
        request.setTimeout(5000, () => {
          request.destroy();
          reject(new Error('Request timeout'));
        });
      });

      // Debug: log response structure
      if (response?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject) {
        const geoObject = response.response.GeoObjectCollection.featureMember[0].GeoObject;
        
        // Try different address fields
        const address = 
          geoObject.metaDataProperty?.GeocoderMetaData?.text ||
          geoObject.metaDataProperty?.GeocoderMetaData?.Address?.formatted ||
          geoObject.name;
        
        if (address) {
          console.log('Yandex address found:', address);
          // Clean up address - remove country if it's just "Uzbekistan"
          const cleanedAddress = address.replace(/\s*\/\s*Uzbekistan\s*/gi, '').trim();
          return cleanedAddress || address;
        }
      }
      
      console.log('Yandex API response structure:', JSON.stringify(response, null, 2).substring(0, 500));
    } catch (yandexError) {
      console.error('Yandex Geocoding API error:', yandexError.message);
    }

    // Fallback: Try OpenStreetMap Nominatim API (free, no API key)
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=uz`;
      
      const response = await new Promise((resolve, reject) => {
        const request = https.get(nominatimUrl, {
          headers: {
            'User-Agent': 'TelegramBot/1.0'
          }
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (error) {
              reject(error);
            }
          });
        });
        
        request.on('error', (error) => {
          reject(error);
        });
        
        request.setTimeout(5000, () => {
          request.destroy();
          reject(new Error('Request timeout'));
        });
      });

      if (response?.display_name) {
        // Format address from Nominatim response
        const address = response.display_name;
        console.log('Nominatim address found:', address);
        
        // Extract useful parts (street, house number, etc.)
        const addressParts = [];
        if (response.address) {
          if (response.address.road) addressParts.push(response.address.road);
          if (response.address.house_number) addressParts.push(response.address.house_number);
          if (response.address.suburb || response.address.neighbourhood) {
            addressParts.push(response.address.suburb || response.address.neighbourhood);
          }
        }
        
        if (addressParts.length > 0) {
          return addressParts.join(', ');
        }
        
        // Fallback to full display name but remove country
        return address.replace(/\s*,\s*Uzbekistan\s*/gi, '').trim();
      }
    } catch (nominatimError) {
      console.error('Nominatim API error:', nominatimError.message);
    }

    return null;
  } catch (error) {
    console.error('Error getting address from coordinates:', error.message);
    return null;
  }
};

/**
 * Format location as clickable links for Telegram
 * @param {string} location - Coordinates in format "latitude, longitude"
 * @param {string} addressName - Optional address name from geocoding
 * @returns {string} - Formatted location text with links
 */
export const formatLocationLinks = (location, addressName = null) => {
  if (!location) return '';

  try {
    const coords = location.split(',').map(c => c.trim());
    if (coords.length !== 2) return `🗺️ Lokatsiya: ${location}`;

    const [lat, lon] = coords.map(Number);
    if (isNaN(lat) || isNaN(lon)) return `🗺️ Lokatsiya: ${location}`;

    // Google Maps link
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    
    // Yandex Maps link
    const yandexMapsUrl = `https://yandex.uz/maps/?ll=${lon},${lat}&z=16&pt=${lon},${lat}`;

    let locationText = '🗺️ Lokatsiya:\n';
    
    if (addressName) {
      locationText += `📍 ${addressName}\n`;
    }
    
    locationText += `[🗺️ Google Maps](${googleMapsUrl}) | [🗺️ Yandex Maps](${yandexMapsUrl})`;

    return locationText;
  } catch (error) {
    console.error('Error formatting location links:', error);
    return `🗺️ Lokatsiya: ${location}`;
  }
};

