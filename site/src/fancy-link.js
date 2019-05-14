import React from "react";
import { Link } from "gatsby";
import colors from "./colors";

export let FancyLink = props => (
  <div
    css={{ display: "flex", justifyContent: "center", alignItems: "center" }}
  >
    <Link
      css={{
        display: "block",
        color: "inherit",
        textDecoration: "none",
        fontWeight: "bold",
        paddingLeft: 32,
        paddingRight: 32,
        paddingTop: 8,
        paddingBottom: 8,
        marginLeft: -32,
        marginRight: -32,
        border: `${colors.base} solid 4px`,
        borderRadius: 8,
        ":hover": {
          backgroundColor: colors.base,
          color: "white"
        }
      }}
      {...props}
    />
  </div>
);
