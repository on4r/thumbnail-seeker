const { exec } = require("child_process")
const fs = require('fs')
const pixelmatch = require('pixelmatch')
const JPEG = require('jpeg-js')
const { v4: uuidv4 } = require('uuid')

const ThumbnailSeeker = async function({videoUrl})
{
	const tmpdir = `/tmp/thumbseek/${uuidv4()}`
	await fs.mkdirSync(`${tmpdir}/frames`, { recursive: true })
	await downloadVideo(videoUrl, tmpdir)
	await rescaleThumb(tmpdir)
	await extractFrames(tmpdir)
	return await calculateDiff(tmpdir)
}

function calculateDiff(tmpdir)
{
	return new Promise((resolve, reject) => {
		console.log("Calculating difference")
		const thumb = JPEG.decode(fs.readFileSync(`${tmpdir}/thumb.jpg`))
		const frames = fs.readdirSync(`${tmpdir}/frames`)
		const {width, height} = thumb
		const thumbpos = {
			f: 0,
			e: 100,
			update: function (f, e) {
				console.log(f, e)
				if (e < this.e) {
					this.e = e
					this.f = f
				}
			}
		}

		for (let f = 1; f < frames.length; f++) {
			const fpadd = "0".repeat(5 - String(f).length) + String(f)
			const frame = JPEG.decode(fs.readFileSync(`${tmpdir}/frames/thumb_${fpadd}.jpg`))
			const pxdiff = pixelmatch(thumb.data, frame.data, null, width, height, { threshold: 0.1 })
			const error = Math.round(100 * 100 * pxdiff / (width * height)) / 100
			thumbpos.update(f, error)
		}

		console.log(`Thumb probably at frame ${thumbpos.f} with diff ${thumbpos.e}%`)
		// divide by 2 because we extracted 2 fps (ffmpeg -r 2)
		resolve(thumbpos.f / 2)
	})
}

function downloadVideo(url, tmpdir)
{
	console.log(`Downloading video to ${tmpdir}`)
	return new Promise((resolve, reject) => {
		exec(`youtube-dl --write-thumbnail -f 160 '${url}' -o ${tmpdir}/video.mp4`, (error, stdout, stderr) => {
			if (error) {
				reject(error)
			} else {
				resolve(stdout)
			}
		})
	})
}

function rescaleThumb(tmpdir)
{
	console.log('Rescaling Thumbnail')
	return new Promise((resolve, reject) => {
		const thumbname = fs.existsSync(`${tmpdir}/video.jpg`) ? 'video.jpg' : 'video.webp'
		exec(`ffmpeg -i ${tmpdir}/${thumbname} -vf scale=256:144 ${tmpdir}/thumb.jpg`, (error, stdout, stderr) => {
			if (error) {
				reject(error)
			} else {
				resolve(stdout)
			}
		})
	})
}

function extractFrames(tmpdir)
{
	console.log('Extracting Frames')
	return new Promise((resolve, reject) => {
		exec(`ffmpeg -i ${tmpdir}/video.mp4 -r 2 '${tmpdir}/frames/thumb_%05d.jpg'`, (error, stdout, stderr) => {
			if (error) {
				reject(error)
			} else {
				resolve(stdout)
			}
		})
	})
}

module.exports = ThumbnailSeeker
