import type { MetadataSettings } from '../types';

/**
 * Build FFmpeg metadata arguments from metadata settings.
 * This function generates the metadata-related FFmpeg arguments.
 * 
 * IMPORTANT: This is called AFTER the existing -map_metadata -1 arguments.
 * It adds back specific metadata fields that the user wants to keep or set.
 */
export function buildMetadataArgs(settings: MetadataSettings): string[] {
  const args: string[] = [];

  // If preset is 'keep-original', don't add any metadata args
  // The existing -map_metadata -1 will handle it
  if (settings.preset === 'keep-original') {
    return args;
  }

  // Add general metadata fields
  if (settings.title !== null) {
    if (settings.title === '') {
      // Explicitly clear
      args.push('-metadata', 'title=');
    } else {
      args.push('-metadata', `title=${settings.title}`);
    }
  }

  if (settings.description !== null) {
    if (settings.description === '') {
      args.push('-metadata', 'description=');
    } else {
      args.push('-metadata', `description=${settings.description}`);
    }
  }

  if (settings.comment !== null) {
    if (settings.comment === '') {
      args.push('-metadata', 'comment=');
    } else {
      args.push('-metadata', `comment=${settings.comment}`);
    }
  }

  if (settings.author !== null) {
    if (settings.author === '') {
      args.push('-metadata', 'author=');
      args.push('-metadata', 'artist=');
    } else {
      args.push('-metadata', `author=${settings.author}`);
      args.push('-metadata', `artist=${settings.author}`);
    }
  }

  if (settings.artist !== null) {
    if (settings.artist === '') {
      args.push('-metadata', 'artist=');
    } else {
      args.push('-metadata', `artist=${settings.artist}`);
    }
  }

  if (settings.copyright !== null) {
    if (settings.copyright === '') {
      args.push('-metadata', 'copyright=');
    } else {
      args.push('-metadata', `copyright=${settings.copyright}`);
    }
  }

  if (settings.keywords !== null) {
    if (settings.keywords === '') {
      args.push('-metadata', 'keywords=');
    } else {
      args.push('-metadata', `keywords=${settings.keywords}`);
    }
  }

  if (settings.genre !== null) {
    if (settings.genre === '') {
      args.push('-metadata', 'genre=');
    } else {
      args.push('-metadata', `genre=${settings.genre}`);
    }
  }

  if (settings.language !== null) {
    if (settings.language === '') {
      args.push('-metadata', 'language=');
    } else {
      args.push('-metadata', `language=${settings.language}`);
    }
  }

  // Date fields
  if (settings.creationDate === 'clear') {
    args.push('-metadata', 'creation_time=');
    args.push('-metadata', 'date=');
  } else if (settings.creationDate !== 'keep' && settings.creationDate) {
    args.push('-metadata', `creation_time=${settings.creationDate}`);
    args.push('-metadata', `date=${settings.creationDate}`);
  }

  if (settings.recordingDate === 'clear') {
    args.push('-metadata', 'recording_date=');
  } else if (settings.recordingDate !== 'keep' && settings.recordingDate) {
    args.push('-metadata', `recording_date=${settings.recordingDate}`);
  }

  // Location fields
  if (settings.clearLocation) {
    args.push('-metadata', 'country=');
    args.push('-metadata', 'city=');
    args.push('-metadata', 'location=');
    args.push('-metadata', 'gps_latitude=');
    args.push('-metadata', 'gps_longitude=');
    args.push('-metadata', 'com.apple.quicktime.location.ISO6709=');
  } else {
    if (settings.country !== null) {
      if (settings.country === '') {
        args.push('-metadata', 'country=');
      } else {
        args.push('-metadata', `country=${settings.country}`);
      }
    }

    if (settings.city !== null) {
      if (settings.city === '') {
        args.push('-metadata', 'city=');
      } else {
        args.push('-metadata', `city=${settings.city}`);
      }
    }

    if (settings.gpsLatitude !== null) {
      if (settings.gpsLatitude === '') {
        args.push('-metadata', 'gps_latitude=');
      } else {
        args.push('-metadata', `gps_latitude=${settings.gpsLatitude}`);
      }
    }

    if (settings.gpsLongitude !== null) {
      if (settings.gpsLongitude === '') {
        args.push('-metadata', 'gps_longitude=');
      } else {
        args.push('-metadata', `gps_longitude=${settings.gpsLongitude}`);
      }
    }
  }

  // Software/encoder
  if (settings.software === 'clear') {
    args.push('-metadata', 'encoder=');
    args.push('-metadata', 'encoding_tool=');
  }

  // Device information
  if (settings.removeDeviceInfo) {
    args.push('-metadata', 'make=');
    args.push('-metadata', 'model=');
    args.push('-metadata', 'lens=');
    args.push('-metadata', 'firmware=');
    args.push('-metadata', 'com.apple.quicktime.make=');
    args.push('-metadata', 'com.apple.quicktime.model=');
    args.push('-metadata', 'com.apple.quicktime.lens=');
  }

  return args;
}

/**
 * Get a summary of what metadata changes will be applied.
 */
export function getMetadataSummary(settings: MetadataSettings): string[] {
  const changes: string[] = [];

  if (settings.preset === 'keep-original') {
    return ['Keeping original metadata'];
  }

  if (settings.preset === 'privacy-clean') {
    return [
      'Removing personal metadata',
      'Clearing GPS/location data',
      'Removing device information',
      'Clearing author/comment fields',
    ];
  }

  if (settings.preset === 'remove-all') {
    return ['Removing all optional metadata'];
  }

  // Custom mode - list specific changes
  if (settings.title !== null) {
    changes.push(settings.title === '' ? 'Clearing title' : 'Setting custom title');
  }
  if (settings.author !== null) {
    changes.push(settings.author === '' ? 'Clearing author' : 'Setting custom author');
  }
  if (settings.clearLocation) {
    changes.push('Clearing location metadata');
  }
  if (settings.removeDeviceInfo) {
    changes.push('Removing device information');
  }
  if (settings.software === 'clear') {
    changes.push('Clearing software/encoder info');
  }

  return changes.length > 0 ? changes : ['No metadata changes'];
}
