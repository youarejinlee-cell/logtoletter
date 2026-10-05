// Approved per-character pose placement; coordinates are absolute on the planet canvas.
export const approvedEditorBaseline = "d1812e075b86d79ec472c4183ff90df098c87583da5ecfc48018ed33a82f1462";
export const approvedCompanionPose: "standing" | "seated" = "seated";
export const planetCompanionOverrides: Record<string, { center: { x: number; y: number }; scale: number; canvas: { width: number; height: number }; anchor: { x: number; y: number } }> = {
  "romi/standing": {
    "center": {
      "x": 384.27,
      "y": 202.49
    },
    "scale": 0.3005464480874317,
    "canvas": {
      "width": 1254,
      "height": 1254
    },
    "anchor": {
      "x": 628,
      "y": 1233
    }
  },
  "romi/seated": {
    "center": {
      "x": 382.25,
      "y": 174.67
    },
    "scale": 0.24636058230683092,
    "canvas": {
      "width": 1086,
      "height": 1448
    },
    "anchor": {
      "x": 579.5,
      "y": 1104.68
    }
  },
  "rogi/standing": {
    "center": {
      "x": 378.17,
      "y": 212.75
    },
    "scale": 0.3147353361945637,
    "canvas": {
      "width": 1254,
      "height": 1254
    },
    "anchor": {
      "x": 627.5,
      "y": 1210
    }
  },
  "rogi/seated": {
    "center": {
      "x": 388.53,
      "y": 185.85
    },
    "scale": 0.2712700369913687,
    "canvas": {
      "width": 1254,
      "height": 1254
    },
    "anchor": {
      "x": 666.5,
      "y": 933.04
    }
  },
  "roa/standing": {
    "center": {
      "x": 372.14,
      "y": 211.21
    },
    "scale": 0.31654676258992803,
    "canvas": {
      "width": 1254,
      "height": 1254
    },
    "anchor": {
      "x": 627.5,
      "y": 1207
    }
  },
  "roa/seated": {
    "center": {
      "x": 373.26,
      "y": 190.43
    },
    "scale": 0.31117397454031115,
    "canvas": {
      "width": 1254,
      "height": 1254
    },
    "anchor": {
      "x": 626.5,
      "y": 944.6700000000001
    }
  },
  "rona/standing": {
    "center": {
      "x": 393.19,
      "y": 209.41
    },
    "scale": 0.2853437094682231,
    "canvas": {
      "width": 1254,
      "height": 1254
    },
    "anchor": {
      "x": 663.5,
      "y": 1203
    }
  },
  "rona/seated": {
    "center": {
      "x": 394.11,
      "y": 155.48
    },
    "scale": 0.24691358024691357,
    "canvas": {
      "width": 1254,
      "height": 1254
    },
    "anchor": {
      "x": 681.5,
      "y": 934.2
    }
  }
};
