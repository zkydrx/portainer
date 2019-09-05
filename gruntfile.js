const webpackDevConfig = require('./webpack/webpack.develop');
const webpackProdConfig = require('./webpack/webpack.production');
var gruntfile_cfg = {};
var loadGruntTasks = require('load-grunt-tasks');
var os = require('os');
var arch = os.arch();
if (arch === 'x64') arch = 'amd64';

module.exports = function(grunt) {
  loadGruntTasks(grunt, {
    pattern: ['grunt-*', 'gruntify-*']
  });

  grunt.registerTask('default', ['eslint', 'build']);

  grunt.registerTask('build-webapp', [
    'config:prod',
    'env:prod',
    'clean:all',
    'copy:templates',
    'webpack:prod']);

  grunt.registerTask('build', [
    'config:dev',
    'shell:buildBinary:linux:' + arch,
    'shell:downloadDockerBinary:linux:' + arch,
    'copy:templates',
    'webpack:dev'
  ]);

  grunt.registerTask('build-server', [
    'shell:buildBinary:linux:' + arch,
    'shell:downloadDockerBinary:linux:' + arch,
    'copy:templates',
    'shell:run:' + arch
  ]);

  grunt.task.registerTask('release', 'release:<platform>:<arch>',
    function (p = 'linux', a = arch) {
      grunt.task.run([
        'config:prod',
        'env:prod',
        'clean:all',
        'copy:templates',
        'shell:buildBinary:' + p + ':' + a,
        'shell:downloadDockerBinary:' + p + ':' + a,
        'webpack:prod'
      ]);
    });

  grunt.task.registerTask('devopsbuild', 'devopsbuild:<platform>:<arch>',
    function(p, a) {
      grunt.task.run([
        'config:prod',
        'env:prod',
        'clean:all',
        'copy:templates',
        'shell:buildBinaryOnDevOps:' + p + ':' + a,
        'shell:downloadDockerBinary:' + p + ':' + a,
        'webpack:prod'
      ]);
    });

  grunt.registerTask('lint', ['eslint']);
  grunt.registerTask('run-dev', ['build', 'shell:run', 'watch:build']);
  grunt.registerTask('clear', ['clean:app']);

  grunt.registerTask('run-dev', [
    'config:dev',
    'build-server',
    'webpack:devWatch'
  ]);
  grunt.registerTask('clear', ['clean:app']);

  // Project configuration.
  grunt.initConfig({
    root: 'dist',
    distdir: 'dist/public',
    shippedDockerVersion: '18.09.3',
    shippedDockerVersionWindows: '17.09.0-ce',
    config: gruntfile_cfg.config,
    src: gruntfile_cfg.src,
    clean: gruntfile_cfg.clean,
    eslint: gruntfile_cfg.eslint,
    shell: gruntfile_cfg.shell,
    copy: gruntfile_cfg.copy,
    webpack: gruntfile_cfg.webpack,
    env: gruntfile_cfg.env
  });
};

/***/

gruntfile_cfg.env = {
  dev: {
    NODE_ENV: 'development'
  },
  prod: {
    NODE_ENV: 'production'
  }
};

gruntfile_cfg.webpack = {
  dev: webpackDevConfig,
  prod: webpackProdConfig,
  devWatch: Object.assign({ watch: true }, webpackDevConfig)
};

gruntfile_cfg.config = {
  dev: { options: { variables: { environment: 'development' } } },
  prod: { options: { variables: { environment: 'production' } } }
};

gruntfile_cfg.src = {
  js: ['app/**/__module.js', 'app/**/*.js', '!app/**/*.spec.js'],
  jsTpl: ['<%= distdir %>/templates/**/*.js'],
  html: ['index.html'],
  tpl: ['app/**/*.html'],
  css: ['assets/css/app.css', 'app/**/*.css']
};

gruntfile_cfg.clean = {
  all: ['<%= root %>/*'],
  app: [
    '<%= distdir %>/*',
    '!<%= distdir %>/../portainer*',
    '!<%= distdir %>/../docker*'
  ],
  tmpl: ['<%= distdir %>/templates'],
  tmp: [
    '<%= distdir %>/js/*',
    '!<%= distdir %>/js/app.*.js',
    '<%= distdir %>/css/*',
    '!<%= distdir %>/css/app.*.css'
  ]
};

gruntfile_cfg.eslint = {
  src: ['gruntfile.js', '<%= src.js %>'],
  options: { configFile: '.eslintrc.yml' }
};


gruntfile_cfg.copy = {
  templates: {
    files: [
      {
        dest: '<%= root %>/',
        src: 'templates.json',
        cwd: ''
      }
    ]
  }
};

function shell_buildBinary(p, a) {
  var binfile = 'dist/portainer';
  if (p === 'linux') {
    return [
      'if [ -f ' + (binfile) + ' ]; then',
      'echo "Portainer binary exists";',
      'else',
      'build/build_binary.sh ' + p + ' ' + a + ';',
      'fi'
    ].join(' ');
  } else {
    return [
      'powershell -Command "& {if (Get-Item -Path ' + binfile + '.exe -ErrorAction:SilentlyContinue) {',
      'Write-Host "Portainer binary exists"',
      '} else {',
      '& ".\\build\\build_binary.ps1" -platform ' + p + ' -arch ' + a + '',
      '}}"'
    ].join(' ');
  }
}

function shell_buildBinaryOnDevOps(p, a) {
  if (p === 'linux') {
    return 'build/build_binary_devops.sh ' + p + ' ' + a + ';';
  } else {
    return 'powershell -Command ".\\build\\build_binary_devops.ps1 -platform ' + p + ' -arch ' + a + '"';
  }
}

function shell_run() {
  return [
    'docker rm -f portainer',
    'docker run -d -p 8000:8000 -p 9000:9000 -v $(pwd)/dist:/app -v /tmp/portainer:/data -v /var/run/docker.sock:/var/run/docker.sock:z --name portainer portainer/base /app/portainer --no-analytics --template-file /app/templates.json'
  ].join(';');
}

function shell_downloadDockerBinary(p, a) {
  var ps = { 'windows': 'win', 'darwin': 'mac' };
  var as = { 'amd64': 'x86_64', 'arm': 'armhf', 'arm64': 'aarch64' };
  var ip = ((ps[p] === undefined) ? p : ps[p]);
  var ia = ((as[a] === undefined) ? a : as[a]);
  var binaryVersion = ((p === 'windows' ? '<%= shippedDockerVersionWindows %>' : '<%= shippedDockerVersion %>'));
  if (p === 'linux' || p === 'mac') {
    return [
      'if [ -f dist/docker ]; then',
      'echo "Docker binary exists";',
      'else',
      'build/download_docker_binary.sh ' + ip + ' ' + ia + ' ' + binaryVersion + ';',
      'fi'
    ].join(' ');
  } else {
    return [
      'powershell -Command "& {if (Get-Item -Path dist/docker.exe -ErrorAction:SilentlyContinue) {',
      'Write-Host "Docker binary exists"',
      '} else {',
      '& ".\\build\\download_docker_binary.ps1" -docker_version ' + binaryVersion + '',
      '}}"'
    ].join(' ');
  }
}

gruntfile_cfg.shell = {
  buildBinary: { command: shell_buildBinary },
  buildBinaryOnDevOps: { command: shell_buildBinaryOnDevOps },
  run: { command: shell_run },
  downloadDockerBinary: { command: shell_downloadDockerBinary }
};
