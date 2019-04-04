/**
 * Export the Infrastructure Types that we support
 * Each type may have certain characteristics within infrastructure-components
 */
export default {
    /**
     * The infrastructure is the top-level component of any infrastructure-components configuration
     * infrastructures define the Plugins supported in the configuration
     */
    INFRASTRUCTURE_TYPE_INFRASTRUCTURE: "INFRASTRUCTURE_TYPE_INFRASTRUCTURE",

    /**
     * a client produces a webpack configuration, e.g. a webapp or an API endpoint
     */
    INFRASTRUCTURE_TYPE_CLIENT: "INFRASTRUCTURE_TYPE_CLIENT",

    /**
     * A component has no special characteristics
     * what they do is completely up to their plugins
     */
    INFRASTRUCTURE_TYPE_COMPONENT: "INFRASTRUCTURE_TYPE_COMPONENT"
};
