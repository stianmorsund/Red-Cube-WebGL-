#Red-Cube-WebGL

A simple game where you need to press the red cube to win. Demonstrates "picking"-technique in WebGL
<hr>
Since WebGL renders graphics onto the canvas-tag, it is not possible to access these objects from within the DOM like you normally would in Javascript. We can make a framebuffer-object (FBO) to read a block of pixels onto using WebGLs readPixels()-function. Further we can map our objects to different colors, thereby making it possible to handle interactions by the user from within the canvas. 
