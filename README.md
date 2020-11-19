# thumbnail-seeker
> return position of thumbnail in video

## requirements

- youtube-dl 
- ffmpeg

## how to use

### install dependencies

    npm install

### run binary

    ./bin/thumbseek <videoUrl>

### remove downloaded files

    npm run cleanup

## what it does

### download video (lowest quality, video only) and thumbnail

    youtube-dl --write-thumbnail -f 160 <video_url> -o video.mp4

### rescale thumbnail to fit video size

    ffmpeg -i video.jpg -vf scale=256:144 thumb.jpg

### extract frames (1 or 2 per second)

    ffmpeg -i video.mp4 -r 2 "./frames/thumb_%05d.jpg"

### compare all frames with the thumbnail using pixelmatch
> try a different `threshold` for better results

    pixelmatch(thumb.data, frame.data, null, width, height, {threshold: 0.1});

### return frame with the least amount of error
