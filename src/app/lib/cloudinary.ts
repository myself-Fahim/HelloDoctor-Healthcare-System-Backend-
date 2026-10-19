import { v2 as Cloudinary } from 'cloudinary';
import config from '../config';


console.log({
    cloud_name: Boolean(config.cloudinary_cloud_name),
    api_key: Boolean(config.cloudinary_api_key),
    api_secret: Boolean(config.cloudinary_api_secret),
});


Cloudinary.config({
  cloud_name: config.cloudinary_cloud_name,
  api_key: config.cloudinary_api_key,
  api_secret: config.cloudinary_api_secret
});

export const cloudinary = Cloudinary