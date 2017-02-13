attribute  vec4 vPosition;
varying vec4 fColor;
uniform vec4 vColor;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 translate;
uniform vec4 lightPosition;

void main()
{
    vec3 pos = -(modelViewMatrix * vPosition).xyz;
    gl_Position = projectionMatrix *  modelViewMatrix * translate * vPosition;
    fColor = vColor;
}