import template from './sw-cms-el-product-listing.html.twig';
import './sw-cms-el-product-listing.scss';

const { Mixin } = Shopware;

/**
 * @private
 * @package discovery
 */
export default {
    template,

    compatConfig: Shopware.compatConfig,

    mixins: [
        Mixin.getByName('cms-element'),
    ],

    computed: {
        currentDemoProducts() {
            return Shopware.Store.get('cmsPage').currentDemoProducts;
        },

        demoProductCount() {
            return this.currentDemoProducts?.length || 8;
        },

        demoProductElement() {
            return {
                config: {
                    boxLayout: {
                        source: 'static',
                        value: this.element.config.boxLayout.value,
                    },
                    displayMode: {
                        source: 'static',
                        value: 'standard',
                    },
                },
                data: null,
            };
        },
    },

    created() {
        this.createdComponent();
    },

    mounted() {
        this.mountedComponent();
    },

    methods: {
        createdComponent() {
            this.initElementConfig('product-listing');
        },

        mountedComponent() {
            const section = this.$el.closest('.sw-cms-section');

            if (!this.$el?.closest?.classList?.contains) {
                return;
            }

            if (section.classList.contains('is--sidebar')) {
                this.demoProductCount = 6;
            }
        },

        getProduct(index) {
            const product = this.currentDemoProducts?.at(index - 1);

            if (product) {
                return { ...this.demoProductElement, data: { product } };
            }

            return this.demoProductElement;
        },
    },
};
