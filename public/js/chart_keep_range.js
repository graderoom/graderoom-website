// With every dataset hidden (or zeroed), Chart.js resets an axis to 0 to 1. Keep its last range instead
Chart.register({
    id: "keepAxisRange",
    afterDataLimits(chart, {scale}) {
        let {min, max} = scale.getMinMax(true);
        let empty = !(min <= max) || (min === 0 && max === 0);
        if (!empty) {
            scale.$lastRange = [scale.min, scale.max];
        } else if (scale.$lastRange) {
            [scale.min, scale.max] = scale.$lastRange;
        }
    }
});
