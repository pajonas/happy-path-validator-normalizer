<?php declare(strict_types=1);

namespace Shopware\Tests\Unit\Core\System\Country\SalesChannel;

use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Shopware\Core\Framework\Adapter\Cache\AbstractCacheTracer;
use Shopware\Core\Framework\Adapter\Cache\CacheValueCompressor;
use Shopware\Core\Framework\Api\Context\SalesChannelApiSource;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\Cache\EntityCacheKeyGenerator;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\EntitySearchResult;
use Shopware\Core\Framework\Feature;
use Shopware\Core\Framework\Log\Package;
use Shopware\Core\Framework\Uuid\Uuid;
use Shopware\Core\System\Country\CountryCollection;
use Shopware\Core\System\Country\Event\CountryRouteCacheKeyEvent;
use Shopware\Core\System\Country\SalesChannel\AbstractCountryRoute;
use Shopware\Core\System\Country\SalesChannel\CachedCountryRoute;
use Shopware\Core\System\Country\SalesChannel\CountryRouteResponse;
use Shopware\Core\System\SalesChannel\SalesChannelContext;
use Shopware\Core\System\SalesChannel\SalesChannelEntity;
use Shopware\Core\Test\Generator;
use Symfony\Component\EventDispatcher\EventDispatcher;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Contracts\Cache\CacheInterface;

/**
 * @deprecated tag:v6.7.0 - Remove full class
 *
 * @internal
 */
#[Package('fundamentals@discovery')]
#[CoversClass(CachedCountryRoute::class)]
class CachedCountryRouteTest extends TestCase
{
    private MockObject&AbstractCountryRoute $decorated;

    private MockObject&CacheInterface $cache;

    private EventDispatcher $eventDispatcher;

    private CachedCountryRoute $cachedRoute;

    private SalesChannelContext $context;

    private CountryRouteResponse $response;

    protected function setUp(): void
    {
        Feature::skipTestIfActive('cache_rework', $this);
        $this->decorated = $this->createMock(AbstractCountryRoute::class);
        $this->cache = $this->createMock(CacheInterface::class);
        $this->eventDispatcher = new EventDispatcher();
        $salesChannel = new SalesChannelEntity();
        $salesChannel->setId(Uuid::randomHex());
        $this->context = Generator::generateSalesChannelContext(
            baseContext: new Context(new SalesChannelApiSource(Uuid::randomHex())),
            salesChannel: $salesChannel
        );
        $this->response = new CountryRouteResponse(
            new EntitySearchResult(
                'entity',
                1,
                new CountryCollection(),
                null,
                new Criteria(),
                Context::createDefaultContext()
            )
        );

        $this->cachedRoute = new CachedCountryRoute(
            $this->decorated,
            $this->cache,
            $this->createMock(EntityCacheKeyGenerator::class),
            $this->createMock(AbstractCacheTracer::class),
            $this->eventDispatcher,
            []
        );
    }

    public function testLoadWithDisabledCacheWillCallDecoratedRoute(): void
    {
        $this->decorated
            ->expects(static::once())
            ->method('load')
            ->willReturn($this->response);
        $this->cache
            ->expects(static::never())
            ->method('get');
        $this->eventDispatcher->addListener(
            CountryRouteCacheKeyEvent::class,
            fn (CountryRouteCacheKeyEvent $event) => $event->disableCaching()
        );

        $this->cachedRoute->load(new Request(), new Criteria(), $this->context);
    }

    public function testLoadWithEnabledCacheWillReturnDataFromCache(): void
    {
        $this->decorated
            ->expects(static::never())
            ->method('load');
        $this->cache
            ->expects(static::once())
            ->method('get')
            ->willReturn(CacheValueCompressor::compress($this->response));
        $this->eventDispatcher->addListener(
            CountryRouteCacheKeyEvent::class,
            fn (CountryRouteCacheKeyEvent $event) => $event
        );

        $this->cachedRoute->load(new Request(), new Criteria(), $this->context);
    }
}
