import { rollup, OutputOptions, Plugin, RollupOptions } from 'rollup';
import path from 'path';
import fs from 'fs';
import esbuild from 'rollup-plugin-esbuild';
import typescript from 'rollup-plugin-typescript2';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import { setCacheCodes } from '../src/cacheCodes';

enum MODE {
  DEV = 'dev',
  PROD = 'prod',
}

function getRollupOptions(mode: MODE) {
  const plugins: Plugin[] = [resolve(), commonjs()];
  if (mode === MODE.DEV) {
    plugins.push(
      typescript({
        tsconfigOverride: {
          compilerOptions: {
            module: 'es2015',
            target: 'es2017',
            jsx: 'react',
            jsxFactory: 'Px.createElement',
            jsxFragmentFactory: 'Px.Fragment',
          },
          exclude: ['node_modules'],
        },
      }),
    );
  } else {
    plugins.push(
      esbuild({
        // esbuild会导致sourcemap有问题
        include: /\.[jt]sx?$/, // default, inferred from `loaders` option
        exclude: /node_modules/, // default
        // sourceMap: true, // by default inferred from rollup's `output.sourcemap` option
        minify: true,
        target: 'es2017', // default, or 'es20XX', 'esnext'
        jsx: 'transform', // default, or 'preserve'
        jsxFactory: 'Px.createElement',
        jsxFragment: 'Px.Fragment',
      }),
    );
  }
  const inputOptions: RollupOptions = {
    input: path.resolve('codes/index.ts'),
    plugins,
  };

  const outputOptions: OutputOptions = {
    file: path.resolve('output/index.js'),
    format: 'es',
    sourcemap: mode === MODE.DEV,
  };
  return { inputOptions, outputOptions };
}

async function build() {
  const startTime = Date.now();
  const { inputOptions, outputOptions } = getRollupOptions(MODE.DEV);
  const bundle = await rollup(inputOptions);
  // await bundle.write(outputOptions);
  const { output } = await bundle.generate(outputOptions);
  const { code, map } = output[0];
  setCacheCodes({ code, map });

  await fs.promises.writeFile(path.resolve('output/index.js'), code);
  if (map) {
    await fs.promises.writeFile(
      path.resolve('output/index.js.map'),
      JSON.stringify(map),
    );
  }

  const endTime = Date.now();
  console.log(`build success,cost ${endTime - startTime}ms`);
}

export default build;
