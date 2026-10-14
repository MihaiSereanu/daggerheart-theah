import postcss from 'rollup-plugin-postcss';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';

export default {
    input: 'daggerheart.mjs',
    output: {
        file: 'build/daggerheart.js',
        format: 'cjs',
        sourcemap: true
    },
    plugins: [
        json(),
        postcss({
            config: {
                path: './postcss.config.js'
            },
            extensions: ['.css'],
            extract: 'tagify.css'
        }),
        commonjs({
            include: /node_modules/,
            requireReturnsDefault: 'auto'
        }),
        resolve()
    ]
};
