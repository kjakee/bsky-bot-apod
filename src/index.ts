import axios from 'axios';
import { AtpAgent, RichText } from "@atproto/api";
import dotenv from 'dotenv';
import { date } from 'zod';

dotenv.config();

// NASA API URL and Key
const NASA_APOD_URL = 'https://api.nasa.gov/planetary/apod';
const NASA_API_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';

// Bluesky Credentials
const BLUESKY_USERNAME = process.env.BLUESKY_USERNAME || '';
const BLUESKY_PASSWORD = process.env.BLUESKY_PASSWORD || '';

async function getRandomAPOD(): Promise<{ url: string; title: string; explanation: string, imageDate: string }> {
    const startDate = new Date(2023, 1, 1);
    const endDate = new Date();

    // Generate random date
    const randomDate = new Date(
        startDate.getTime() +
        Math.random() * (endDate.getTime() - startDate.getTime())
    );
    const imageDate = randomDate.toISOString().split('T')[0];

    // Fetch APOD
    const response = await axios.get(NASA_APOD_URL, {
        params: {
            api_key: NASA_API_KEY,
            date: imageDate,
        },
    });

    const { url, title, explanation, media_type } = response.data;

    // Ensure we get an image, not a video
    if (media_type !== 'image') {
        return getRandomAPOD();
    }


    return { url, title, explanation, imageDate };
}

async function postToBluesky(imageUrl: string, title: string, explanation: string, imageDate: string): Promise<void> {
    const agent = new AtpAgent({ service: 'https://bsky.social' });

    // Login to Bluesky
    await agent.login({
        identifier: BLUESKY_USERNAME,
        password: BLUESKY_PASSWORD,
    });

    // Create the post content
    const text = `${title}\nImage from NASA APOD. Please check NASA APOD for further details and image credits.\nDate in APOD: ${imageDate}\n#Space #Astronomy #Cosmos #Universe #Galaxy #SpaceExploration`;
    const rt = new RichText({ text: text });
    await rt.detectFacets(agent);
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });

    // Upload the image
    const image = await agent.uploadBlob(imageResponse.data, {
        encoding: 'image/jpeg', // Adjust if image is PNG
    });

    // Create and post the feed
    await agent.post({
        text: rt.text,
        facets: rt.facets,
        embed: {
            $type: 'app.bsky.embed.images',
            images: [
                {
                    image: image.data.blob,
                    alt: explanation,
                },
            ],
        },
    });

    console.log('Posted to Bluesky successfully!');
}

async function main() {
    try {
        const apod = await getRandomAPOD();
        console.log('Fetched APOD:', apod);
        await postToBluesky(apod.url, apod.title, apod.explanation, apod.imageDate);
    } catch (error) {
        console.error(error);
    }
}

main();
