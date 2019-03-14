// @flow
// based on https://github.com/jamiebuilds/std-pkg but reading fewer things, adding setters and reading the file
import is from "sarcastic";
import globby from "globby";
import { Item } from "./item";
import { Entrypoint } from "./entrypoint";

/*::
import {Project} from './project'
*/

export class Package extends Item {
  project: Project;
  entrypoints: Array<Entrypoint>;
  get configEntrypoints(): Array<string> {
    return is(
      this._config.entrypoints,
      is.default(is.arrayOf(is.string), ["."])
    );
  }
  async _init() {
    let filenames = await globby(this.configEntrypoints, {
      cwd: this.directory,
      onlyDirectories: true,
      absolute: true,
      expandDirectories: false
    });

    this.entrypoints = await Promise.all(
      filenames.map(async filename => {
        let entrypoint = await Entrypoint.create(filename);
        entrypoint.package = this;
        return entrypoint;
      })
    );
  }

  _initSync() {
    let filenames = globby.sync(this.configEntrypoints, {
      cwd: this.directory,
      onlyDirectories: true,
      absolute: true,
      expandDirectories: false
    });

    this.entrypoints = filenames.map(filename => {
      let entrypoint = Entrypoint.createSync(filename);
      entrypoint.package = this;
      return entrypoint;
    });
  }

  get name(): string {
    return is(this.json.name, is.string);
  }
  set name(name: string) {
    this.json.name = name;
  }

  get dependencies(): null | { [key: string]: string } {
    return is(this.json.dependencies, is.maybe(is.objectOf(is.string)));
  }
  get peerDependencies(): null | { [key: string]: string } {
    return is(this.json.peerDependencies, is.maybe(is.objectOf(is.string)));
  }
}
