const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const { TwitterClient } = require("twitter-api-client");

// Create Express Server
const app = express();

// CORS configuration
app.use(
  cors({
    origin: ["http://localhost:3000", "https://findyourtech-2022.web.app"],
  })
);

// Configuration
const PORT = 3001;
const HOST = "localhost";

// Logging
app.use(morgan("dev"));

app.disable('etag');

const tweetToTechItem = (tweet) => {
  const tweetToMap = tweet.extended_tweet ? tweet.extended_tweet : tweet;
  return {
    id: tweet.id,
    description: tweet.text.replace(/(?:https?|ftp):\/\/[\n\S]+/g, ""),
    user: {
      avatar: tweet.user.profile_image_url_https,
      id: tweet.user.screen_name,
    },
    image:
      tweetToMap.entities.media && tweetToMap.entities.media.length > 0
        ? tweetToMap.entities.media[0].media_url_https
        : "",
    date: tweet.created_at,
    url: `https://twitter.com/${tweet.user.id}/status/${tweet.id_str}`,
    video: getVideoUrl(tweetToMap),
  };
};

const getVideoUrl = (tweet) => {
  if (
    tweet.extended_entities &&
    tweet.extended_entities.media[0] &&
    tweet.extended_entities.media[0].type === "video"
  ) {
    return getQualityVideo(
      tweet.extended_entities.media[0].video_info.variants
    );
  } else if (tweet.entities && tweet.entities.urls.length > 0) {
    return tweet.entities.urls[0].expanded_url;
  }
};

const getQualityVideo = (videoInfo) => {
  let video = {
    bitrate: 0,
    content_type: "",
    url: "",
  };
  videoInfo.forEach((currentVideo) => {
    if (
      currentVideo.content_type === "video/mp4" &&
      currentVideo.bitrate > video.bitrate &&
      currentVideo.url
    ) {
      video = currentVideo;
    }
  });
  return video.url;
};

// GET Tech
app.get("/tech", async (req, res, next) => {
  let q = '"%23DNFDuel" AND -filter:retweets AND filter:videos"';
  if (req.query.hashtag) {
    q = `"%23${req.query.hashtag}" AND -filter:retweets AND filter:videos`;
  }
  const authHeader = req.headers.authorization;
  const tokens = authHeader.split(",");
  const accessToken = tokens[0];
  const accessTokenSecret = tokens[1];
  // Initialize twitter api client
  const twitterClient = new TwitterClient({
    apiKey: "QuN1MlUF5v12GlqDxx2OgaIze",
    apiSecret: "pZc8RJCrtUapmapvb7EdEuoT1Uw1Ts6HS3a5TvBSvjD5vLURh5",
    accessToken,
    accessTokenSecret,
  });
  try {
    const twitterData = await twitterClient.tweets.search({ q });
    const tweetsFiltered = twitterData.statuses.filter((tweet) => tweet.tru);
    const techItems = tweetsFiltered.map((tweet) => tweetToTechItem(tweet));
    res.status(200).json({ techItems });
  } catch (err) {
    res.status(500).json({ err });
  }
});

// Authorization
app.use("", (req, res, next) => {
  if (req.headers.authorization) {
    next();
  } else {
    res.sendStatus(403);
  }
});

// Start the Proxy
app.listen(PORT, HOST, () => {
  console.log(`Starting Proxy at ${HOST}:${PORT}`);
});
