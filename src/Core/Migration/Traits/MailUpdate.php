<?php declare(strict_types=1);

namespace Shopware\Core\Migration\Traits;

use Shopware\Core\Framework\Log\Package;

#[Package('core')]
class MailUpdate
{
    /**
     * @var string
     *
     * @deprecated tag:v6.7.0 - Will be natively typed
     */
    protected $type;

    /**
     * @var string|null
     *
     * @deprecated tag:v6.7.0 - Will be natively typed
     */
    protected $enPlain;

    /**
     * @var string|null
     *
     * @deprecated tag:v6.7.0 - Will be natively typed
     */
    protected $enHtml;

    /**
     * @var string|null
     *
     * @deprecated tag:v6.7.0 - Will be natively typed
     */
    protected $dePlain;

    /**
     * @var string|null
     *
     * @deprecated tag:v6.7.0 - Will be natively typed
     */
    protected $deHtml;

    public function __construct(
        string $type,
        ?string $enPlain = null,
        ?string $enHtml = null,
        ?string $dePlain = null,
        ?string $deHtml = null
    ) {
        $this->type = $type;
        $this->enPlain = $enPlain;
        $this->enHtml = $enHtml;
        $this->dePlain = $dePlain;
        $this->deHtml = $deHtml;
    }

    public function getEnPlain(): ?string
    {
        return $this->enPlain;
    }

    public function setEnPlain(?string $enPlain): void
    {
        $this->enPlain = $enPlain;
    }

    public function getEnHtml(): ?string
    {
        return $this->enHtml;
    }

    public function setEnHtml(?string $enHtml): void
    {
        $this->enHtml = $enHtml;
    }

    public function getDePlain(): ?string
    {
        return $this->dePlain;
    }

    public function setDePlain(?string $dePlain): void
    {
        $this->dePlain = $dePlain;
    }

    public function getDeHtml(): ?string
    {
        return $this->deHtml;
    }

    public function setDeHtml(?string $deHtml): void
    {
        $this->deHtml = $deHtml;
    }

    public function getType(): string
    {
        return $this->type;
    }
}
