import * as THREE from "three";
import {notify, exportGLTF} from "./utils.js";

class Api {
    /**
     * An api object is included in the global scope so that it can be called
     * from the developer console.
     * @param {THREE.Camera} camera
     * @param {THREE.Scene} scene
     * @param {THREE.Renderer} renderer
     * @param {MapControls} controls
     */
    constructor(camera, scene, renderer, controls) {
        this.camera = camera;
        this.scene = scene;
        this.renderer = renderer;
        this.controls = controls;
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Scales the HTML canvas (used for higher resolution
     * in image and video export).
     * You are meant to scale it back again when the export
     * is done, otherwise things will look odd.
     * @param {number} scalingFactor Multiplier to scale the canvas with
     */
    scaleCanvas(scalingFactor=2) {
        const canvas = this.renderer.domElement;
        const width = canvas.width;
        const height = canvas.height;
        canvas.width = width*scalingFactor;
        canvas.height = height*scalingFactor;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(canvas.width, canvas.height);
        this.render();
    }

    /**
     * Export the scene as a glTF/glb 3D shape file.
     * @param {THREE.Scene} scene Scene to export
     * @param {boolean} binary Set to true for binary glb or false for plaintext glTF
     * @param {string} name Name for the file @default "scene"
     */
    exportGLTF(scene=this.scene, binary=false, name="scene") {
        exportGLTF(scene, binary, name);
    }

    /**
     * Export image of the current view
     * @param {number} scaleFactor Multiplier to for higher resolution
     */
    exportImage(scaleFactor, name="scene") {
        if (scaleFactor === undefined) {
            scaleFactor = parseFloat((document.getElementById("exportImageScalingFactor")).value);
        }

        let saveImage = () => {
            this.renderer.domElement.toBlob(blob => {
                var a = document.createElement("a");
                var url = URL.createObjectURL(blob);
                a.href = url;
                a.download = name+".png";
                setTimeout(() => a.click(), 10);
            }, "image/png", 1.0);
        };

        // First scale the canvas with the provided factor, then scale it back.
        new Promise(resolve => {
            this.scaleCanvas(scaleFactor);
            resolve("success");
        }).then(() => {
            try {
                saveImage();
            } catch (error) {
                notify("Canvas is too large to save, please try a smaller scaling factor", "alert");
            }
            this.scaleCanvas(1/scaleFactor);
        });
    }

    showVideoExportWindow() {
        // eslint-disable-next-line no-undef
        Metro.window.create({
            title: "Export video",
            place: "center",
            icon: "<span class='mif-video-camera'></span>",
            content: `
<form>
<div class="form-group">
    <label>File format:</label>
    <select id="videoExportFormat" data-role="select">
        <option value="webm" selected="selected">webm</option>
        <option value="gif">gif</option>
        <option value="png">png</option>
        <option value="jpg">jpg</option>
    </select>
    <small class="text-muted">Webm is a modern video format that is low in file size, while gif takes significantly more space.<br>If you select png or jpg, the output will be a compressed tar of images.</small>

</div>
<div class="form-group">
    <input type="number" value="24" id="videoFramerate" data-role="input" data-prepend="Frame rate" data-append="fps">
    <small class="text-muted">Number of frames per second (used for webm and gif)</small>
</div>
<div class="form-group">
    <input type="number" value="1" id="videoScaleFactor" data-role="input" data-prepend="Scale factor" data-append="times">
    <small class="text-muted">Increase this to get a higher-resolution video</small>
</div>
</form>
<hr>
<button id="videoExportStartButton" class="primary button" onclick="api.exportOrbitingVideo()">Start</button>
<div id="videoExportProgress" data-role="progress" data-type="load" data-value="35" style="display: none"></div>
`
        });
    }

    /**
     * Export video where the camera orbits a given target (by default the center of mass)¨
     * while the trajectory advances.
     * Change the window size to get a different aspect ratio.
     * @param {string} format Video format ("webm", "gif", "png", or "jpg"), the latter two being a set of images in a tar file.
     * @param {number} framerate Number of frames per second
     * @param {number} scaleFactor Multiplier to increase the video resolution
     * @param {number} distance Distance to orbit at
     * @param {number} height Height to orbit at
     * @param {number} nOrbits Number of orbits during the whole trajectory
     * @param {THREE.Vector3} target Target to orbit around
     */
    exportOrbitingVideo(format, framerate, scaleFactor, distance=10, height=5, nOrbits=1, target = this.controls.target) {
        const cameraPathFunction = progress => {
            // Make a circle
            const position = new THREE.Vector3(
                target.x + distance * Math.cos(progress * nOrbits*2*Math.PI),
                height,
                target.z + distance * Math.sin(progress * nOrbits*2*Math.PI)
            );
            return {position, target};
        };
        this.exportVideo(format, framerate, scaleFactor, cameraPathFunction);
    }

    /**
     * Create a video of the trees growing
     * Change the window size to get a different aspect ratio.
     * @param {string} format Video format ("webm", "gif", "png", or "jpg"),
     * the latter two being a set of images in a tar file.
     * @param {number} framerate Number of frames per second
     * @param {number} scaleFactor Multiplier to increase the video resolution
     * @param {function(number): {Vector3, Vector3}} cameraPathFunction
     * Optional function to move the camera as the trajectory progresses. See
     * exportOrbitingVideo() for example usage.
     */
    exportVideo(format, framerate, scaleFactor, cameraPathFunction) {
        if (format === undefined) {
            format = document.getElementById("videoExportFormat").value;
        }
        if (framerate === undefined) {
            framerate = document.getElementById("videoFramerate").valueAsNumber;
        }
        if (scaleFactor === undefined) {
            scaleFactor = document.getElementById("videoScaleFactor").valueAsNumber;
        }

        let stop = false;
        const button = document.getElementById("videoExportStartButton");
        button.innerText = "Stop";
        button.onclick = ()=>{
            stop = true;
        };

        // eslint-disable-next-line no-undef
        const capturer = new CCapture({
            format: format,
            framerate: framerate,
            name: "video",
            workersPath: "libs/"
        });
        capturer.start();

        this.scaleCanvas(scaleFactor);

        this.scene.background = new THREE.Color(0xFFFFFF);

        this.currentFrame = 0;
        const lastFrame = 200; //Math.max(...this.steps);
        const progressBar = document.getElementById("videoExportProgress");
        progressBar.style.display = "block";

        const step = () => {
            if (this.currentFrame >= lastFrame || stop) {
                capturer.stop();
                capturer.save();
                this.scene.background = null;
                this.scaleCanvas(1/scaleFactor);
                button.onclick = ()=>{this.exportVideo();};
                button.innerText = "Start";
                progressBar.style.display = "none";
            } else {
                //this.nextFrame();
                this.currentFrame++;
                const progress = this.currentFrame / lastFrame;
                if (cameraPathFunction !== undefined) {
                    const s = cameraPathFunction(progress);
                    this.camera.position.copy(s.position);
                    this.controls.target.copy(s.target);
                    this.controls.update();
                }
                this.render();
                capturer.capture(this.renderer.domElement);
                progressBar.dataset.value = (100 * progress);
                requestAnimationFrame(step);
            }
        };

        // Get first frame
        if (cameraPathFunction !== undefined) {
            const s = cameraPathFunction(0);
            this.camera.position.copy(s.position);
            this.controls.target.copy(s.target);
            this.controls.update();
        }
        this.render();
        capturer.capture(this.renderer.domElement);

        // Step through the rest of the trajectory
        step();
    }
}

export {Api};