import { importView } from "preconstruct";

export let Text = {
  ...otherFieldTypeStuff,
  views: {
    Field: importView("./views/Field")
  }
};
