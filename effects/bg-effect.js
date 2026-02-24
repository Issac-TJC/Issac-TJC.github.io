/**
 * WebGL Background Effect - Dark Smoky Noise, Point Light, Particles, CRT
 * Inspired by Animal Well
 */

(function () {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '-1';
    canvas.style.pointerEvents = 'none';
    document.body.appendChild(canvas);

    const gl = canvas.getContext('webgl2');
    if (!gl) {
        console.warn("WebGL 2 not supported, skipping background effect.");
        return;
    }

    let width = document.documentElement.clientWidth;
    let height = document.documentElement.clientHeight;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);

    // Mouse tracking removed

    window.addEventListener('resize', () => {
        width = document.documentElement.clientWidth;
        height = document.documentElement.clientHeight;
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
    });

    const vertexShaderSource = `#version 300 es
    in vec2 a_position;
    out vec2 v_uv;
    void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
    }`;

    // Main Shader: Noise, Point Light, Occlusion, Color Aberration, Scanlines
    const fragmentShaderSource = `#version 300 es
    precision highp float;

    in vec2 v_uv;
    out vec4 outColor;

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_timeScale;
    uniform float u_pixelSize;

    // --- Noise Functions ---
    vec3 hash3(vec2 p) {
        vec3 q = vec3(dot(p, vec2(127.1, 311.7)),
                      dot(p, vec2(269.5, 183.3)),
                      dot(p, vec2(419.2, 371.9)));
        return fract(sin(q) * 43758.5453);
    }

    float valueNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);

        float n00 = fract(sin(dot(i + vec2(0.0, 0.0), vec2(12.9898, 78.233))) * 43758.5453);
        float n10 = fract(sin(dot(i + vec2(1.0, 0.0), vec2(12.9898, 78.233))) * 43758.5453);
        float n01 = fract(sin(dot(i + vec2(0.0, 1.0), vec2(12.9898, 78.233))) * 43758.5453);
        float n11 = fract(sin(dot(i + vec2(1.0, 1.0), vec2(12.9898, 78.233))) * 43758.5453);

        return mix(mix(n00, n10, u.x), mix(n01, n11, u.x), u.y);
    }

    // Fractal Brownian Motion
    float fbm(vec2 p) {
        float f = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 5; i++) {
            f += amp * valueNoise(p);
            p = p * 2.0 + vec2(12.4, 5.1) * (u_time * u_timeScale) * 0.1; 
            amp *= 0.5;
        }
        return f;
    }
    
    // Smoke shape
    float smoke(vec2 uv) {
        vec2 q = uv * 3.0;
        // make it crawl and flow
        q.y -= (u_time * u_timeScale) * 0.2; 
        q.x += sin((u_time * u_timeScale) * 0.1) * 0.5;
        
        float n = fbm(q);
        // Add more detail
        n = fbm(q + n * 2.5);
        
        // Threshold and smooth to get distinct shapes
        float shape = smoothstep(0.3, 0.7, n);
        return shape;
    }

    // Pseudo Particle layer
    float particles(vec2 uv) {
        vec2 p = uv * 10.0;
        p.y += (u_time * u_timeScale) * 0.5;
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec3 h = hash3(i);
        
        float dist = distance(f, h.xy);
        float particle = smoothstep(h.z * 0.1, 0.0, dist);
        
        // fade out pseudo random
        particle *= smoothstep(0.0, 0.1, h.x) * smoothstep(1.0, 0.9, h.x);
        // varying brightness
        particle *= h.y;
        
        return particle;
    }

    vec3 render(vec2 uv, vec2 screen_uv) {
        // Base dark bluish color
        vec3 bgColor = vec3(0.02, 0.02, 0.04);
        vec3 smokeColor = vec3(0.1, 0.15, 0.25);
        
        // Smoke layer (fluid motion)
        float s = smoke(uv);
        
        // Mix colors based on smoke density directly
        vec3 finalColor = mix(bgColor, smokeColor, s);
        
        // Particles
        float p = particles(uv);
        
        // Let particles be bright against the smoke
        vec3 particleColor = vec3(0.3, 0.7, 0.9);
        finalColor += p * particleColor * 0.8;
        
        return finalColor;
    }

    void main() {
        // Pixelate UV coordinates
        vec2 pixel_uv = floor(v_uv * u_resolution / u_pixelSize) * u_pixelSize / u_resolution;
        vec2 uv = pixel_uv;

        // Scale UV so noise aspect ratio is correct
        uv.x *= u_resolution.x / u_resolution.y;
        
        // Chromatic Aberration offset based on distance from center
        vec2 center = vec2(0.5);
        float distFromCenter = distance(pixel_uv, center);
        float caAmount = distFromCenter * 0.005; // 0.005 offset max

        vec2 uvR = pixel_uv + vec2(caAmount, 0.0);
        vec2 uvG = pixel_uv;
        vec2 uvB = pixel_uv - vec2(caAmount, 0.0);

        // Compute Base Color with RGB split
        float r = render(uvR * vec2(u_resolution.x/u_resolution.y, 1.0), uvR).r;
        float g = render(uvG * vec2(u_resolution.x/u_resolution.y, 1.0), uvG).g;
        float b = render(uvB * vec2(u_resolution.x/u_resolution.y, 1.0), uvB).b;

        vec3 color = vec3(r, g, b);

        // CRT Scanlines
        // Create horizontal lines based on screen Y pixel coordinate
        float scanline = sin(v_uv.y * u_resolution.y * 3.14159 * 0.5); // high freq sine
        scanline = scanline * 0.5 + 0.5; // 0 to 1
        // mix scanlines in mildly
        color *= mix(1.0, 0.85 + 0.15 * scanline, 0.3); // 30% scanline strength

        // Vignette
        float vignette = smoothstep(1.5, 0.3, distFromCenter); // dark edges
        color *= vignette;
        
        // Subtle film grain
        float noise = hash3(v_uv * 1000.0 + (u_time * u_timeScale)).x;
        color += (noise - 0.5) * 0.03;

        outColor = vec4(color, 1.0);
    }`;

    // Compile functions
    function compileShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    const vShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        return;
    }

    gl.useProgram(program);

    // Quad Geometry
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            -1, 1,
            1, -1,
            1, 1
        ]),
        gl.STATIC_DRAW
    );

    const positionLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniforms
    const uResolutionLoc = gl.getUniformLocation(program, "u_resolution");
    const uTimeLoc = gl.getUniformLocation(program, "u_time");
    const uTimeScaleLoc = gl.getUniformLocation(program, "u_timeScale");
    const uPixelSizeLoc = gl.getUniformLocation(program, "u_pixelSize");

    let startTime = performance.now();

    function renderLoop() {
        gl.uniform2f(uResolutionLoc, width, height);
        gl.uniform1f(uTimeLoc, (performance.now() - startTime) / 1000.0);
        gl.uniform1f(uTimeScaleLoc, 0.2); // Slower smoke speed
        gl.uniform1f(uPixelSizeLoc, 4.0); // Adjust this value to scale pixel size

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        requestAnimationFrame(renderLoop);
    }

    // Initial draw
    gl.clearColor(0, 0, 0, 1);
    renderLoop();

})();
