// @flow
// based on https://github.com/jamiebuilds/std-pkg but reading fewer things, adding setters and reading the file
import is from "sarcastic";
import { Item } from "./item";
/*::
import {Project} from './project'
*/

import { Entrypoint } from "./entrypoint";

export class Package extends Item {
  project: Project;
  entrypoints: Array<Entrypoint>;

  async _init() {
    let entrypoint = await Entrypoint.create(this.directory);
    entrypoint.package = this;
    this.entrypoints = [entrypoint];
  }

  _initSync() {
    let entrypoint = Entrypoint.createSync(this.directory);
    entrypoint.package = this;
    this.entrypoints = [entrypoint];
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
