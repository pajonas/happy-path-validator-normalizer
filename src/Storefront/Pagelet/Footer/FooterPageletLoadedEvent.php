<?php declare(strict_types=1);

namespace Shopware\Storefront\Pagelet\Footer;

use Shopware\Core\Framework\Log\Package;
use Shopware\Core\System\SalesChannel\SalesChannelContext;
use Shopware\Storefront\Pagelet\PageletLoadedEvent;
use Symfony\Component\HttpFoundation\Request;

#[Package('framework')]
class FooterPageletLoadedEvent extends PageletLoadedEvent
{
    /**
     * @var FooterPagelet
     *
     * @deprecated tag:v6.7.0 - Will be natively typed
     */
    protected $pagelet;

    public function __construct(
        FooterPagelet $pagelet,
        SalesChannelContext $salesChannelContext,
        Request $request
    ) {
        $this->pagelet = $pagelet;
        parent::__construct($salesChannelContext, $request);
    }

    public function getPagelet(): FooterPagelet
    {
        return $this->pagelet;
    }
}
