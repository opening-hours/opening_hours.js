import {readFileSync} from 'fs';
import common from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import yaml from '@rollup/plugin-yaml';

const banner = readFileSync('./src/banner.js', 'utf-8');
const dependencies = process.env.DEPS === 'YES';

function recursivelyDeleteNominatimUrl(data) {
    if (typeof data === 'object') {
        Object.values(data).forEach(recursivelyDeleteNominatimUrl);
    }
    delete data._nominatim_url;
    return data;
}

const yamlPlugin = yaml({
    transform(data) {
        return recursivelyDeleteNominatimUrl(data);
    }
});

export default {
    input: './src/index',
    plugins: dependencies ? [
        nodeResolve(),
        common(),
        yamlPlugin,
    ] : [
        yamlPlugin,
    ],
    external: dependencies ? [] : [
        'i18next',
        'suncalc'
    ],
    output: [
        {
            name: 'opening_hours',
            banner: banner,
            file: 'build/' + (dependencies ? 'opening_hours+deps.js' : 'opening_hours.js'),
            globals: dependencies ? {} : {
                'i18next': 'i18next',
                'suncalc': 'SunCalc'
            },
            format: 'umd',
        },
        {
            name: 'opening_hours',
            file: 'build/' + (dependencies ? 'opening_hours+deps.min.js' : 'opening_hours.min.js'),
            globals: dependencies ? {} : {
                'i18next': 'i18next',
                'suncalc': 'SunCalc'
            },
            format: 'umd',
            plugins: [terser()],
        }
    ]
};
