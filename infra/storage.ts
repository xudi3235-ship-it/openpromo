export const bucket = new sst.aws.Bucket("Storage", {
    transform: {
        publicAccessBlock: {
            blockPublicAcls: false,
            blockPublicPolicy: false,
            ignorePublicAcls: false,
            restrictPublicBuckets: false,
        },
    },
});

new aws.s3.BucketOwnershipControls("ownership-controls", {
    bucket: bucket.name,
    rule: {
        objectOwnership: "ObjectWriter",
    },
});

new aws.s3.BucketLifecycleConfigurationV2("StorageLifecycle", {
    bucket: bucket.name,
    rules: [
        {
            id: "daily",
            status: "Enabled",
            filter: {
                prefix: "temporary/daily/",
            },
            expiration: {
                days: 1,
            },
        },
        {
            id: "weekly",
            status: "Enabled",
            filter: {
                prefix: "temporary/weekly/",
            },
            expiration: {
                days: 7,
            },
        },
        {
            id: "monthly",
            status: "Enabled",
            filter: {
                prefix: "temporary/monthly/",
            },
            expiration: {
                days: 30,
            },
        },
    ],
});
