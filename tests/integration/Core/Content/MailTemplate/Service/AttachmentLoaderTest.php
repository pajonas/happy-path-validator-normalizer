<?php declare(strict_types=1);

namespace Shopware\Tests\Integration\Core\Content\MailTemplate\Service;

use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Shopware\Core\Checkout\Document\DocumentEntity;
use Shopware\Core\Checkout\Document\Renderer\InvoiceRenderer;
use Shopware\Core\Checkout\Document\Service\DocumentGenerator;
use Shopware\Core\Checkout\Document\Service\PdfRenderer;
use Shopware\Core\Checkout\Document\Struct\DocumentGenerateOperation;
use Shopware\Core\Content\MailTemplate\Service\AttachmentLoader;
use Shopware\Core\Content\MailTemplate\Service\Event\AttachmentLoaderCriteriaEvent;
use Shopware\Core\Content\Media\MediaService;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\Feature;
use Shopware\Core\Framework\Log\Package;
use Shopware\Core\Framework\Uuid\Uuid;
use Shopware\Core\System\SalesChannel\Context\SalesChannelContextFactory;
use Shopware\Core\System\SalesChannel\Context\SalesChannelContextService;
use Shopware\Core\System\SalesChannel\SalesChannelContext;
use Shopware\Core\Test\TestDefaults;
use Shopware\Tests\Integration\Core\Checkout\Document\DocumentTrait;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;

/**
 * @deprecated tag:v6.7.0 - Will be removed as the test for the service is not used anymore because the service will be removed
 *
 * @internal
 */
#[Package('after-sales')]
class AttachmentLoaderTest extends TestCase
{
    use DocumentTrait;

    private AttachmentLoader $attachmentLoader;

    private DocumentGenerator $documentGenerator;

    /**
     * @var EventDispatcherInterface&MockObject
     */
    private EventDispatcherInterface $eventDispatcherMock;

    private SalesChannelContext $salesChannelContext;

    private Context $context;

    protected function setUp(): void
    {
        $this->documentGenerator = static::getContainer()->get(DocumentGenerator::class);
        $this->eventDispatcherMock = $this->createMock(EventDispatcherInterface::class);

        $this->attachmentLoader = new AttachmentLoader(
            static::getContainer()->get('document.repository'),
            $this->documentGenerator,
            $this->eventDispatcherMock
        );

        $this->context = Context::createDefaultContext();

        $customerId = $this->createCustomer();

        $this->salesChannelContext = static::getContainer()->get(SalesChannelContextFactory::class)->create(
            Uuid::randomHex(),
            TestDefaults::SALES_CHANNEL,
            [
                SalesChannelContextService::CUSTOMER_ID => $customerId,
            ]
        );
    }

    public function testLoad(): void
    {
        if (Feature::isActive('v6.7.0.0')) {
            static::markTestSkipped('deprecated tag:v6.7.0 - Will be removed as the test for the service is not used anymore because the service will be removed');
        }

        $this->eventDispatcherMock->expects(static::once())->method('dispatch')->with(static::callback(static function (AttachmentLoaderCriteriaEvent $event) {
            $criteria = $event->getCriteria();

            return $criteria->hasAssociation('documentMediaFile') && $criteria->hasAssociation('documentType');
        }));

        $cart = $this->generateDemoCart(2);
        $orderId = $this->persistCart($cart);

        $operation = new DocumentGenerateOperation($orderId);

        $result = $this->documentGenerator->generate(InvoiceRenderer::TYPE, [$orderId => $operation], $this->context);
        $errors = $result->getErrors();
        static::assertEmpty($errors, 'Invoice generation failed: ' . array_pop($errors)?->getMessage());

        $document = $result->getSuccess()->first();
        static::assertNotNull($document);

        $attachments = $this->attachmentLoader->load([$document->getId()], Context::createDefaultContext());
        static::assertCount(1, $attachments);
        static::assertIsArray($attachments[0]);
        static::assertArrayHasKey('content', $attachments[0]);

        $criteria = new Criteria([$document->getId()]);
        $criteria->addAssociation('documentMediaFile');

        /** @var DocumentEntity $actualDocument */
        $actualDocument = static::getContainer()->get('document.repository')->search($criteria, $this->context)->first();

        static::assertNotNull($actualDocument);
        static::assertNotNull($actualDocument->getDocumentMediaFileId());
        static::assertNotNull($actualDocument->getDocumentMediaFile());

        $content = static::getContainer()->get(MediaService::class)->loadFile($actualDocument->getDocumentMediaFileId(), $this->context);

        $fileName = $actualDocument->getDocumentMediaFile()->getFileName() . '.' . $actualDocument->getDocumentMediaFile()->getFileExtension();
        static::assertNotNull($content);
        static::assertSame($content, $attachments[0]['content']);
        static::assertArrayHasKey('fileName', $attachments[0]);
        static::assertSame($fileName, $attachments[0]['fileName']);
        static::assertArrayHasKey('mimeType', $attachments[0]);
        static::assertSame(PdfRenderer::FILE_CONTENT_TYPE, $attachments[0]['mimeType']);
    }
}
