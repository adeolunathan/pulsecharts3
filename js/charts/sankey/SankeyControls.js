// js/charts/sankey/SankeyControls.js
const SankeyCapabilities = {
    layout: {
        title: "Layout Controls",
        controls: [
            {
                id: "nodeWidth",
                type: "slider",
                label: "Node Width", 
                min: 15,
                max: 50,
                default: 28,
                step: 1,
                description: "Width of flow nodes"
            },
            {
                id: "nodePadding", 
                type: "slider",
                label: "Node Spacing",
                min: 20,
                max: 100,
                default: 40,
                step: 5,
                description: "Vertical spacing between nodes"
            },
            {
                id: "autoCenter",
                type: "toggle",
                label: "Auto Center",
                default: true,
                description: "Automatically center chart horizontally"
            }
        ]
    },
    styling: {
        title: "Visual Style",
        controls: [
            {
                id: "curveIntensity",
                type: "slider", 
                label: "Curve Intensity",
                min: 0.1,
                max: 0.8,
                default: 0.4,
                step: 0.1,
                description: "How curved the flow lines are"
            },
            {
                id: "colorScheme",
                type: "dropdown",
                label: "Color Scheme",
                options: [
                    { value: "default", label: "Default" },
                    { value: "corporate", label: "Corporate" },
                    { value: "vibrant", label: "Vibrant" },
                    { value: "accessible", label: "High Contrast" }
                ],
                default: "default"
            },
            {
                id: "nodeOpacity",
                type: "slider",
                label: "Node Opacity", 
                min: 0.5,
                max: 1.0,
                default: 1.0,
                step: 0.1
            }
        ]
    },
    advanced: {
        title: "Advanced Options",
        collapsed: true, // Start collapsed
        controls: [
            {
                id: "layerCurvature",
                type: "custom",
                component: "LayerCurvatureEditor",
                label: "Per-Layer Curvature",
                description: "Set different curve intensity for each layer"
            },
            {
                id: "customColors",
                type: "custom", 
                component: "ColorSchemeEditor",
                label: "Custom Colors",
                description: "Define custom colors for each node category"
            }
        ]
    }
};